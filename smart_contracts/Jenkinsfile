node {
  stage('SCM') {
    checkout scm
  }
  stage('SmartContract Testing') {
        sh "cd smart_contracts && ./DevOps/functionalTestsLifeCycle.sh"
  }
}
